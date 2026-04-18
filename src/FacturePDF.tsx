// FacturePDF.tsx
import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface CartItem {
  nom_medicament: string;
  quantite: number;
  ppv: number;
}

interface FacturePDFProps {
  cart: CartItem[];
  total: number;
  totalArticle: number;
  patientName: string;
  Pharmacien: string;
}

// Fonction utilitaire pour convertir un montant en lettres (français)
const numberToFrenchWords = (value: number) => {
  const unite = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const dizaine = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  const convertHundreds = (num: number): string => {
    let words = "";
    const centaine = Math.floor(num / 100);
    const reste = num % 100;

    if (centaine > 0) {
      words += centaine === 1 ? "cent" : `${unite[centaine]} cent`;
      if (reste > 0) words += " ";
    }

    if (reste > 0) {
      if (reste < 10) {
        words += unite[reste];
      } else if (reste < 20) {
        const special = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
        words += special[reste - 10];
      } else {
        const d = Math.floor(reste / 10);
        const u = reste % 10;
        if (d === 7 || d === 9) {
          words += dizaine[d] + (u + 10 > 0 ? "-" + unite[u + 10] : "");
        } else {
          words += dizaine[d] + (u > 0 ? "-" + unite[u] : "");
        }
      }
    }
    return words;
  };

  const dirhams = Math.floor(value);
  const centimes = Math.round((value - dirhams) * 100);

  let result = `${convertHundreds(dirhams)} dirhams`;
  if (centimes > 0) {
    result += ` et ${convertHundreds(centimes)} centimes`;
  }
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const FacturePDF: React.FC<FacturePDFProps> = ({
  cart,
  total,
  totalArticle,
  patientName,
  Pharmacien,
}) => {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // FACTURE title centered
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(34, 139, 34); // green
    doc.text("FACTURE", pageWidth / 2, 20, { align: "center" });

    // Pharmacy name
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text("PHARMACIE EL ABAWAIN", 14, 32);

    // Registration number
    doc.setFontSize(10);
    doc.text("N° REGISTRE IMAGINAIRE: 123456789", 14, 38);

    // Date & Patient
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString("fr-FR");
    doc.setFontSize(12);
    doc.text(`Date: ${dateStr}`, 14, 48);
    doc.text(`Patient: ${patientName}`, 14, 56);
    doc.text(`Pharmacien: ${Pharmacien}`, 14, 64);

    // Table
    const tableColumn = [
      "Désignation",
      "Quantité",
      "PPV (DH)",
      "Prix Total (DH)",
    ];
    const tableRows = cart.map((item) => [
      item.nom_medicament,
      item.quantite,
      item.ppv.toFixed(2),
      (item.ppv * item.quantite).toFixed(2),
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: "grid",
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      styles: { fontSize: 11, cellPadding: 2 },

      didDrawPage: (_data) => {
        const pageHeight = doc.internal.pageSize.height;

        // Ligne horizontale
        doc.text(
          "----------------------------------------------------------------------------------------------------------------------------------------------------------------",
          14,
          pageHeight - 30
        );

        // Footer text
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(
          "Lotissement Al Wafaa 800H Deroua - IF: 14390907 – Patente: 55802006 – CNSS: 5446077",
          14,
          pageHeight - 20
        );
        doc.text("Tel: 05-22-51-40-49", 14, pageHeight - 12);
      },
    });

    // Totaux à la fin du tableau
    const tableEndY = (doc as any).lastAutoTable?.finalY || 75;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Nombre d’articles: ${totalArticle}`, 14, tableEndY + 10);
    doc.text(`TOTAL: ${total.toFixed(2)} DH`, 14, tableEndY + 18);

    // Montant en lettres
    const totalEnLettres = numberToFrenchWords(total);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.text(`arrêter la présente facture à la somme de : ${totalEnLettres}`, 14, tableEndY + 26);

    doc.save("Facture.pdf");
  };

  return (
    <button
      className="bg-white hover:bg-purple-700 text-blue-700 px-5 py-3 rounded-lg font-semibold shadow-md"
      onClick={generatePDF}
    >
      🧾 Générer Facture PDF
    </button>
  );
};

export default FacturePDF;
