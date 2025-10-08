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

      // ✅ Footer sur chaque page
      didDrawPage: (_data) => {
        const pageHeight = doc.internal.pageSize.height;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        // Ligne horizontale
        doc.text(
          "----------------------------------------------------------------------------------------------------------------------------------------------------------------",
          14,
          pageHeight - 30
        );

        // Footer text
        doc.text(
          "ADRESSE: 123 RUE IMAGINAIRE, CASABLANCA",
          14,
          pageHeight - 20
        );
        doc.text("TÉL: +212 6X XX XX XX", 14, pageHeight - 12);
      },
    });

    // Totaux à la fin du tableau
    const tableEndY = (doc as any).lastAutoTable?.finalY || 75;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Nombre d’articles: ${totalArticle}`, 14, tableEndY + 10);
    doc.text(`TOTAL: ${total.toFixed(2)} DH`, 14, tableEndY + 18);

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
