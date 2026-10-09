const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/partidas/[id]/page.tsx', 'utf8');
content = content.replace('                  </span>\n                )}\n              </div>\n            ))}','                  </span>\n                )}\n                {s.delta != null && (\n                  <span className={\mt-0.5 text-xs font-bold \\}>\n                    {s.delta > 0 ? \"+\" : \"\"}{s.delta} Elo\n                  </span>\n                )}\n              </div>\n            ))}');
fs.writeFileSync('src/app/(app)/partidas/[id]/page.tsx', content);
