const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/estadisticas/page.tsx', 'utf8');
content = content.replace('\
      </div>)}\n      </>\n      )}\n      </>\n      )}\n    </>\n  );\n}\n', '\n      </div>)}\n      </>\n      )}\n      </>\n      )}\n    </>\n  );\n}\n');
fs.writeFileSync('src/app/(app)/estadisticas/page.tsx', content);
