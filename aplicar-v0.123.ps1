# =========================================================================
#  PokeArena TCG - aplicar la v0.123.0 sobre la v0.122.0
#
#  Lo lanza aplicar-v0.123.bat (doble clic). Va en ASCII a proposito:
#  Windows PowerShell 5.1 lee los .ps1 sin BOM como ANSI.
#
#  Que hace, en orden:
#    1. Comprueba que esta en la raiz del repo de PokeArena y la version.
#    2. Copia _v0.123\ encima del repo y BORRA _v0.123\ en seguida.
#       (El fallo de la v0.121: la carpeta se quedaba dentro del repo mientras
#       se verificaba, y `tsc` compilaba esas copias sueltas y fallaba.)
#    3. Borra los ficheros que ya no hacen falta.
#    4. npm run verificar  y  npm run build.
#    5. Si todo pasa: git add + git commit + git push a la rama actual.
#  Todo lo que sale por pantalla queda tambien en aplicar-v0.123.log
#  (mandalo si algo falla). Nunca toca .env*, ni la base de datos.
# =========================================================================

$ErrorActionPreference = 'Stop'
$raiz  = Split-Path -Parent $MyInvocation.MyCommand.Path
$carga = Join-Path $raiz '_v0.123'
$log   = Join-Path $raiz 'aplicar-v0.123.log'
Set-Location $raiz
try { Start-Transcript -Path $log -Force | Out-Null } catch { }

function Paso($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Fin($codigo) { try { Stop-Transcript | Out-Null } catch { }; exit $codigo }
function Mal($t)  { Write-Host ""; Write-Host "ERROR: $t" -ForegroundColor Red; Write-Host "Detalle completo en aplicar-v0.123.log" -ForegroundColor Yellow; Fin 1 }

# ---------------------------------------------------------------- 1. comprobar
Paso 'Comprobando el repositorio'
if (-not (Test-Path (Join-Path $raiz 'package.json'))) { Mal "No hay package.json aqui. Descomprime el zip en la raiz del repo (donde esta package.json)." }
$pkg = Get-Content (Join-Path $raiz 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($pkg.name -ne 'poke-arena') { Mal "Este package.json es de '$($pkg.name)', no de poke-arena." }
Write-Host "Version actual: $($pkg.version)"
$yaCopiado = $pkg.version -eq '0.123.0'
if (-not (Test-Path $carga) -and -not $yaCopiado) { Mal "No encuentro la carpeta _v0.123 junto al script." }
if (@('0.122.0', '0.123.0') -notcontains $pkg.version) {
  $r = Read-Host "Esta actualizacion va sobre la 0.122.0 (aplica antes la v0.122) y tienes la $($pkg.version). Continuar igualmente? (s/n)"
  if ($r -ne 's') { Write-Host 'Cancelado. No se ha tocado nada.'; Fin 1 }
}
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) { Mal 'No encuentro git. Instala Git for Windows o haz el commit a mano.' }
$ErrorActionPreference = 'Continue'
$rama = (& git rev-parse --abbrev-ref HEAD 2>$null)
$sucio = (& git status --porcelain 2>$null) | Where-Object { $_ -notmatch '_v0\.12|aplicar-v0\.12|arena-v0\..*\.zip' }
$ErrorActionPreference = 'Stop'
if (-not $rama) { Mal 'Esta carpeta no es un repositorio de git.' }
Write-Host "Rama: $rama"
if ($sucio) {
  Write-Host 'Aviso: tienes cambios sin commitear. Entraran en el mismo commit de la v0.123:' -ForegroundColor Yellow
  $sucio | ForEach-Object { Write-Host "   $_" }
  $r = Read-Host 'Continuar? (s/n)'
  if ($r -ne 's') { Write-Host 'Cancelado. No se ha tocado nada.'; Fin 1 }
}

# ---------------------------------------------------------------- 2. copiar
if (Test-Path $carga) {
  Paso 'Copiando los ficheros de la v0.123'
  $n = 0
  Get-ChildItem -LiteralPath $carga -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($carga.Length).TrimStart('\', '/')
    if ($rel -like '.env*') { return }
    $destino = Join-Path $raiz $rel
    $dir = Split-Path -Parent $destino
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Copy-Item -LiteralPath $_.FullName -Destination $destino -Force
    Write-Host "  + $rel"
    $n++
  }
  Write-Host "$n ficheros copiados."
  # Fuera YA, antes de verificar (ver cabecera).
  Remove-Item -LiteralPath $carga -Recurse -Force
}

# ---------------------------------------------------------------- 3. limpiar
Paso 'Borrando lo que ya no hace falta'
$borrar = @(
  'IMPLEMENTAR-v0.121.0.md',
  '_v0.122', 'aplicar-v0.122.bat', 'aplicar-v0.122.ps1', 'aplicar-v0.122.log'
)
foreach ($rel in $borrar) {
  $p = Join-Path $raiz $rel
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force; Write-Host "  - $rel" }
}

# ---------------------------------------------------------------- 4. verificar
$ErrorActionPreference = 'Continue'   # npm escribe avisos por stderr
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Mal 'No encuentro npm (Node.js).' }
if (-not (Test-Path (Join-Path $raiz 'node_modules'))) {
  Paso 'No hay node_modules: npm install'
  & npm install
  if ($LASTEXITCODE -ne 0) { Mal 'npm install ha fallado.' }
}
Paso 'npm run verificar  (codificacion + acciones + textos + pruebas + tipos)'
& npm run verificar
if ($LASTEXITCODE -ne 0) { Mal 'La verificacion ha fallado: NO se ha hecho commit. Los ficheros nuevos ya estan copiados; mira el error de arriba. Puedes volver a lanzar el .bat cuando lo arregles.' }
Paso 'npm run build'
& npm run build
if ($LASTEXITCODE -ne 0) { Mal 'El build ha fallado: NO se ha hecho commit. Si tienes abierto "npm run dev", cierralo (Windows bloquea la carpeta .next) y vuelve a lanzar el .bat.' }

# ---------------------------------------------------------------- 5. commit y push
Paso "git commit y push a '$rama'"
$ps1 = $MyInvocation.MyCommand.Path
Remove-Item -LiteralPath $ps1 -Force -ErrorAction SilentlyContinue
& git add -A -- . ':(exclude)aplicar-v0.123.bat' ':(exclude)aplicar-v0.123.log' ':(exclude)arena-v0.*.zip'
& git commit -m "v0.123.0: causas de derrota, no presentado y bye, grafico de causas, torneos pasados solo Regionales, localizador mas preciso"
if ($LASTEXITCODE -ne 0) { Write-Host 'Nada nuevo que commitear (o el commit ha fallado: mira arriba).' -ForegroundColor Yellow }
& git push
if ($LASTEXITCODE -ne 0) { Mal "El push ha fallado (el commit SI esta hecho en local). Prueba  git push  a mano: puede que falte iniciar sesion en GitHub." }

Write-Host ''
Write-Host "v0.123.0 aplicada, verificada, en commit y subida a '$rama'. Vercel desplegara solo." -ForegroundColor Green
Write-Host 'RECUERDA: aplica drizzle/0035_v0_123_0.sql en Neon (primero dev) para las causas de derrota.' -ForegroundColor Yellow
Write-Host 'Pruebas a mano en IMPLEMENTAR-v0.123.0.md.' -ForegroundColor Green
Fin 0
