function beautifySpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  
  // Colores Premium
  const headerBg = "#0a1428"; // Azul Oscuro Wargods
  const headerText = "#fbbf24"; // Dorado Wargods
  const winBg = "#dcfce7";
  const winFont = "#166534";
  const lossBg = "#fee2e2";
  const lossFont = "#991b1b";

  // 1. Hoja MATCHES
  const matches = ss.getSheetByName('MATCHES');
  if (matches) {
    const lastRow = matches.getLastRow();
    if (lastRow > 1) {
      const range = matches.getRange(2, 1, lastRow - 1, matches.getLastColumn());
      const data = range.getValues();
      const backgrounds = [];
      const fontColors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const result = String(row[5]);
        const role = String(row[4]);
        
        if (result.includes("Win")) {
          backgrounds.push(new Array(row.length).fill(winBg));
          fontColors.push(new Array(row.length).fill(winFont));
          if (!result.includes("✅")) data[i][5] = "Win ✅";
        } else if (result.includes("Loss")) {
          backgrounds.push(new Array(row.length).fill(lossBg));
          fontColors.push(new Array(row.length).fill(lossFont));
          if (!result.includes("❌")) data[i][5] = "Loss ❌";
        } else {
          backgrounds.push(new Array(row.length).fill(i % 2 === 0 ? "#ffffff" : "#f8fafc"));
          fontColors.push(new Array(row.length).fill("#1e293b"));
        }

        if (role === "TOP" && !role.includes("🛡️")) data[i][4] = "🛡️ TOP";
        else if ((role === "JUNGLE" || role === "JNG") && !role.includes("🗡️")) data[i][4] = "🗡️ JNG";
        else if ((role === "MIDDLE" || role === "MID") && !role.includes("🧙")) data[i][4] = "🧙 MID";
        else if ((role === "BOTTOM" || role === "BOT" || role === "ADC") && !role.includes("🏹")) data[i][4] = "🏹 ADC";
        else if ((role === "UTILITY" || role === "SUPP" || role === "SUPPORT") && !role.includes("✨")) data[i][4] = "✨ SUPP";
      }

      range.setBackgrounds(backgrounds);
      range.setFontColors(fontColors);
      range.setValues(data);
    }
    matches.getRange("A1:P1").setBackground(headerBg).setFontColor(headerText).setFontWeight("bold").setHorizontalAlignment("center");
    matches.setFrozenRows(1);
  }

  // 2. Hoja RANKING
  const ranking = ss.getSheetByName('RANKING');
  if (ranking) {
    ranking.getRange("A1:H1").setBackground(headerBg).setFontColor(headerText).setFontWeight("bold");
    ranking.setFrozenRows(1);
  }
}
