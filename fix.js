const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/estadisticas/page.tsx', 'utf8');
content = content.replace('<section className="card mt-4">\n        <div className="card-head">\n          <h2 className="text-lg font-bold">Matriz de emparejamientos</h2>', '{fuente !== "live" && (<section className="card mt-4">\n        <div className="card-head">\n          <h2 className="text-lg font-bold">Matriz de emparejamientos</h2>');
content = content.replace('La intensidad crece con el número de partidas.</span>\n          </div>\n        </div>\n      </section>', 'La intensidad crece con el número de partidas.</span>\n          </div>\n        </div>\n      </section>)}');
fs.writeFileSync('src/app/(app)/estadisticas/page.tsx', content);
