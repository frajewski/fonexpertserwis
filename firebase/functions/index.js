const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Pomocnicze
 */
function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

function phoneMatches(inputPhone, storedPhone) {
  const input = normalizePhone(inputPhone);
  const stored = normalizePhone(storedPhone);

  if (!input || !stored) return false;

  return input === stored || input.endsWith(stored) || stored.endsWith(input);
}

function getUserPhone(userData = {}) {
  return (
    userData.phone ||
    userData.phoneNumber ||
    userData.customerPhone ||
    userData.tel ||
    userData.mobile ||
    ""
  );
}

function getRepairPhone(repairData = {}) {
  return (
    repairData.phone ||
    repairData.phoneNumber ||
    repairData.customerPhone ||
    repairData.clientPhone ||
    repairData.tel ||
    repairData.mobile ||
    ""
  );
}

function repairToPublicData(doc) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    displayNumber: data.displayNumber || "",
    brand: data.brand || "",
    model: data.model || "",
    description: data.description || "",
    status: data.status || "Przyjęte",
    createdAt:
      data.createdAt ||
      data.createdAtServer?.toDate?.()?.toISOString?.() ||
      null,
    partsCost: Number(data.partsCost || 0),
    serviceCost: Number(data.serviceCost || 0),
    estimateAccepted: data.estimateAccepted ?? null,
    warrantyMonths: Number(data.warrantyMonths || 0),
    warrantyEndDate: data.warrantyEndDate || null,
  };
}

async function assertPhoneMatchesRepair(repair, inputPhone) {
  const directPhone = getRepairPhone(repair);

  if (directPhone && phoneMatches(inputPhone, directPhone)) {
    return true;
  }

  if (!repair.customerId) {
    return false;
  }

  const userDoc = await db.collection("users").doc(repair.customerId).get();

  if (!userDoc.exists) {
    return false;
  }

  const user = userDoc.data() || {};
  const userPhone = getUserPhone(user);

  return phoneMatches(inputPhone, userPhone);
}

/**
 * Funkcja używana przez panel webowy:
 * wyszukiwanie jednego zlecenia po numerze zlecenia i telefonie.
 */
exports.lookupRepair = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const { displayNumber, phone } = request.data || {};

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      if (!displayNumber || !phone) {
        throw new HttpsError(
          "invalid-argument",
          "Brakuje numeru zlecenia albo telefonu."
        );
      }

      const cleanDisplayNumber = String(displayNumber).trim();

      const repairsSnap = await db
        .collection("repairs")
        .where("displayNumber", "==", cleanDisplayNumber)
        .limit(10)
        .get();

      if (repairsSnap.empty) {
        throw new HttpsError("not-found", "Nie znaleziono zlecenia.");
      }

      for (const repairDoc of repairsSnap.docs) {
        const repair = repairDoc.data() || {};
        const matches = await assertPhoneMatchesRepair(repair, phone);

        if (matches) {
          return repairToPublicData(repairDoc);
        }
      }

      throw new HttpsError(
        "permission-denied",
        "Numer telefonu nie pasuje do zlecenia."
      );
    } catch (err) {
      console.error("lookupRepair error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

/**
 * Funkcja używana przez panel webowy:
 * pobiera wszystkie zlecenia klienta po numerze telefonu.
 */
exports.lookupRepairsByPhone = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const { phone } = request.data || {};

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      if (!phone) {
        throw new HttpsError("invalid-argument", "Brakuje numeru telefonu.");
      }

      const matchedUserIds = [];

      const usersSnap = await db.collection("users").limit(1000).get();

      usersSnap.forEach((userDoc) => {
        const user = userDoc.data() || {};
        const storedPhone = getUserPhone(user);

        if (phoneMatches(phone, storedPhone)) {
          matchedUserIds.push(userDoc.id);
        }
      });

      const repairs = [];

      if (matchedUserIds.length > 0) {
        for (const userId of matchedUserIds) {
          const repairsSnap = await db
            .collection("repairs")
            .where("customerId", "==", userId)
            .get();

          repairsSnap.forEach((repairDoc) => {
            repairs.push(repairToPublicData(repairDoc));
          });
        }
      }

      /**
       * Dodatkowy fallback:
       * gdyby kiedyś telefon był zapisany bezpośrednio w repairs jako customerPhone.
       */
      const allRepairsSnap = await db.collection("repairs").limit(1000).get();

      allRepairsSnap.forEach((repairDoc) => {
        const repair = repairDoc.data() || {};
        const repairPhone = getRepairPhone(repair);

        if (repairPhone && phoneMatches(phone, repairPhone)) {
          const alreadyAdded = repairs.some((r) => r.id === repairDoc.id);
          if (!alreadyAdded) {
            repairs.push(repairToPublicData(repairDoc));
          }
        }
      });

      repairs.sort((a, b) => {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return { repairs };
    } catch (err) {
      console.error("lookupRepairsByPhone error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

/**
 * Akceptacja kosztorysu z panelu webowego.
 */
exports.acceptEstimateWeb = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const { repairId, phone } = request.data || {};

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      if (!repairId || !phone) {
        throw new HttpsError(
          "invalid-argument",
          "Brakuje ID zlecenia albo telefonu."
        );
      }

      const repairRef = db.collection("repairs").doc(repairId);
      const repairDoc = await repairRef.get();

      if (!repairDoc.exists) {
        throw new HttpsError("not-found", "Nie znaleziono zlecenia.");
      }

      const repair = repairDoc.data() || {};
      const matches = await assertPhoneMatchesRepair(repair, phone);

      if (!matches) {
        throw new HttpsError(
          "permission-denied",
          "Numer telefonu nie pasuje do zlecenia."
        );
      }

      await repairRef.update({
        estimateAccepted: true,
        history: FieldValue.arrayUnion({
          date: new Date().toISOString(),
          status: "Kosztorys zaakceptowany przez klienta",
        }),
      });

      return { ok: true };
    } catch (err) {
      console.error("acceptEstimateWeb error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

/**
 * Odrzucenie kosztorysu z panelu webowego.
 */
exports.rejectEstimateWeb = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const { repairId, phone } = request.data || {};

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      if (!repairId || !phone) {
        throw new HttpsError(
          "invalid-argument",
          "Brakuje ID zlecenia albo telefonu."
        );
      }

      const repairRef = db.collection("repairs").doc(repairId);
      const repairDoc = await repairRef.get();

      if (!repairDoc.exists) {
        throw new HttpsError("not-found", "Nie znaleziono zlecenia.");
      }

      const repair = repairDoc.data() || {};
      const matches = await assertPhoneMatchesRepair(repair, phone);

      if (!matches) {
        throw new HttpsError(
          "permission-denied",
          "Numer telefonu nie pasuje do zlecenia."
        );
      }

      await repairRef.update({
        estimateAccepted: false,
        status: "Odwołane",
        history: FieldValue.arrayUnion({
          date: new Date().toISOString(),
          status: "Kosztorys odrzucony przez klienta",
        }),
      });

      return { ok: true };
    } catch (err) {
      console.error("rejectEstimateWeb error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

/**
 * Formularz "Umów naprawę" z panelu webowego.
 * Zapisuje zgłoszenie do kolekcji bookingRequests.
 */
exports.createBookingRequestWeb = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const data = request.data || {};

      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      const name = String(data.name || "").trim();
      const phone = normalizePhone(data.phone || "");
      const company = String(data.company || "").trim();
      const brand = String(data.brand || "").trim();
      const model = String(data.model || "").trim();
      const description = String(data.description || "").trim();
      const preferredDate = String(data.preferredDate || "").trim();

      if (!name || !phone || !brand || !description) {
        throw new HttpsError(
          "invalid-argument",
          "Wypełnij imię i nazwisko, telefon, markę urządzenia i opis usterki."
        );
      }

      const docRef = await db.collection("bookingRequests").add({
        customerId: null, // brak konta — zgłoszenie "papierowe", admin przypisze klienta później
        customerName: name,
        customerPhone: phone,
        company,
        brand,
        model,
        description,
        preferredDate,
        status: "Oczekuje", // BOOKING_STATUS.PENDING – musi się zgadzać z constants/bookingStatuses.js,
        // inaczej panel admina (BookingsPage.jsx) nie rozpoznaje statusu i nie pokazuje
        // przycisków akcji (akceptuj/odrzuć), więc zgłoszenie wygląda jakby "nie dało się otworzyć"
        source: "web",
        createdAt: new Date().toISOString(),
        createdAtServer: FieldValue.serverTimestamp(),
        authUid: request.auth.uid,
      });

      return {
        ok: true,
        id: docRef.id,
      };
    } catch (err) {
      console.error("createBookingRequestWeb error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);


/**
 * Funkcja używana przez panel webowy:
 * wyszukiwanie zlecenia po bezpiecznym tokenie z linku śledzenia.
 * Przykład linku: https://gsmserviceapp-ff8f6.web.app/?token=abc123
 */
exports.lookupRepairByToken = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      const { token } = request.data || {};

      if (!token) {
        throw new HttpsError("invalid-argument", "Brakuje tokenu śledzenia.");
      }

      const cleanToken = String(token).trim();

      const repairsSnap = await db
        .collection("repairs")
        .where("trackingToken", "==", cleanToken)
        .limit(1)
        .get();

      if (repairsSnap.empty) {
        throw new HttpsError("not-found", "Nie znaleziono zlecenia.");
      }

      return repairToPublicData(repairsSnap.docs[0]);
    } catch (err) {
      console.error("lookupRepairByToken error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

/**
 * Funkcje ról — zostawione, bo masz je już wdrożone w Firebase.
 * Dzięki temu po podmianie pliku nie znikną z projektu.
 */

exports.decideInitialRole = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      const uid = request.auth.uid;
      const email = request.auth.token.email || "";
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const existing = userDoc.data() || {};
        return {
          role: existing.role || "customer",
          alreadyExists: true,
        };
      }

      const usersSnap = await db.collection("users").limit(1).get();
      const role = usersSnap.empty ? "admin" : "customer";

      await userRef.set(
        {
          email,
          role,
          createdAt: new Date().toISOString(),
          createdAtServer: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await admin.auth().setCustomUserClaims(uid, { role });

      return {
        role,
        alreadyExists: false,
      };
    } catch (err) {
      console.error("decideInitialRole error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

exports.syncOwnRoleClaim = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      const uid = request.auth.uid;
      const userDoc = await db.collection("users").doc(uid).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Nie znaleziono profilu użytkownika.");
      }

      const user = userDoc.data() || {};
      const role = user.role || "customer";

      await admin.auth().setCustomUserClaims(uid, { role });

      return { role };
    } catch (err) {
      console.error("syncOwnRoleClaim error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);

exports.setUserRoleClaim = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
      }

      const callerUid = request.auth.uid;
      const callerDoc = await db.collection("users").doc(callerUid).get();
      const caller = callerDoc.data() || {};

      if (caller.role !== "admin") {
        throw new HttpsError("permission-denied", "Tylko admin może zmieniać role.");
      }

      // Klient (useStore.js) wysyła { targetUid, newRole } – patrz
      // packages/shared-core/src/useStore.js, updateUserRole(). Wcześniej
      // ta funkcja czytała { uid, role }, przez co ZAWSZE dostawała undefined
      // i odrzucała każdą próbę zmiany roli.
      const { targetUid, newRole } = request.data || {};
      const uid = targetUid;
      const role = newRole;

      if (!uid || !role) {
        throw new HttpsError("invalid-argument", "Brakuje UID albo roli.");
      }

      // "worker" – realna rola używana w całej apce (constants/roles.js,
      // firestore.rules isStaff()). "technician" nigdzie się nie używa –
      // było literówką, przez którą nadanie roli Pracownik zawsze failowało.
      const allowedRoles = ["admin", "worker", "customer"];

      if (!allowedRoles.includes(role)) {
        throw new HttpsError("invalid-argument", "Nieprawidłowa rola.");
      }

      await db.collection("users").doc(uid).set({ role }, { merge: true });
      await admin.auth().setCustomUserClaims(uid, { role });

      return { ok: true, uid, role };
    } catch (err) {
      console.error("setUserRoleClaim error:", err);

      if (err instanceof HttpsError) {
        throw err;
      }

      throw new HttpsError("internal", err.message || "Błąd serwera.");
    }
  }
);