const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function checkPDFFields(pdfPath) {
  try {
    console.log(`\n=== Checking ${pdfPath} ===`);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`Total fields: ${fields.length}`);
    console.log('\nField names:');
    fields.forEach((field, index) => {
      const name = field.getName();
      const type = field.constructor.name;
      console.log(`${index + 1}. "${name}" (${type})`);
    });
  } catch (error) {
    console.error(`Error checking ${pdfPath}:`, error.message);
  }
}

async function main() {
  await checkPDFFields('public/Proposal.pdf');
  await checkPDFFields('public/Proposal1.pdf');
  await checkPDFFields('public/Proposal2.pdf');
}

main();
