/**
 * Representative subset only (not the full ~495 upazilas).
 * Covers a handful of high-traffic districts so cascading dropdowns can be
 * demoed end-to-end. Ping the project owner for a full data source (e.g. a
 * Bangladesh government GIS export) before relying on this for production.
 */
export const upazilasData: Record<string, string[]> = {
  Dhaka: ["Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"],
  Gazipur: ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur"],
  Narayanganj: ["Araihazar", "Bandar", "Narayanganj Sadar", "Rupganj", "Sonargaon"],
  Chattogram: ["Anwara", "Boalkhali", "Patiya", "Rangunia", "Sitakunda"],
  "Cox's Bazar": ["Chakaria", "Cox's Bazar Sadar", "Teknaf", "Ukhia"],
  Cumilla: ["Burichang", "Cumilla Sadar", "Debidwar", "Laksam"],
  Rajshahi: ["Bagha", "Charghat", "Godagari", "Paba", "Rajshahi Sadar"],
  Bogura: ["Bogura Sadar", "Sherpur", "Shibganj"],
  Khulna: ["Batiaghata", "Dumuria", "Khulna Sadar", "Rupsa"],
  Jashore: ["Jashore Sadar", "Jhikargachha", "Manirampur"],
  Barishal: ["Bakerganj", "Barishal Sadar", "Muladi"],
  Sylhet: ["Beanibazar", "Golapganj", "Sylhet Sadar", "Zakiganj"],
  Rangpur: ["Badarganj", "Mithapukur", "Rangpur Sadar"],
  Mymensingh: ["Bhaluka", "Mymensingh Sadar", "Trishal"],
};
