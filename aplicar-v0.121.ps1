# =========================================================================
#  PokeArena TCG - aplicar la v0.121.0 sobre la v0.120.0
#
#  Lo lanza aplicar-v0.121.bat (doble clic). Va en ASCII a proposito:
#  Windows PowerShell 5.1 lee los .ps1 sin BOM como ANSI y los acentos se
#  romperian. Los ficheros del proyecto se COPIAN tal cual (bytes), asi que
#  su UTF-8 sin BOM no se toca.
#
#  Que hace:
#    1. Comprueba que esta en la raiz del repo de PokeArena y la version.
#    2. Copia _v0.121\ encima del repo.
#    3. Borra los ficheros que ya no hacen falta (solo si existen).
#    4. npm run verificar  y, si pasa,  npm run build.
#    5. Si todo va bien, se borra a si mismo y la carpeta _v0.121\.
#  Nunca toca .env*, ni la base de datos, ni hace commits.
# =========================================================================

$ErrorActionPreference = 'Stop'
$raiz  = Split-Path -Parent $MyInvocation.MyCommand.Path
$carga = Join-Path $raiz '_v0.121'
Set-Location $raiz

function Paso($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Mal($t)  { Write-Host "ERROR: $t" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 1. comprobar
Paso 'Comprobando el repositorio'
if (-not (Test-Path (Join-Path $raiz 'package.json'))) { Mal "No hay package.json aqui. Descomprime el zip en la raiz del repo (donde esta package.json)." }
if (-not (Test-Path $carga)) { Mal "No encuentro la carpeta _v0.121 junto al script." }
$pkg = Get-Content (Join-Path $raiz 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($pkg.name -ne 'poke-arena') { Mal "Este package.json es de '$($pkg.name)', no de poke-arena." }
Write-Host "Version actual: $($pkg.version)"
if (@('0.120.0', '0.121.0') -notcontains $pkg.version) {
  $r = Read-Host "Esta actualizacion va sobre la 0.120.0 (aplica antes la v0.120) y tienes la $($pkg.version). Continuar igualmente? (s/n)"
  if ($r -ne 's') { Write-Host 'Cancelado. No se ha tocado nada.'; exit 1 }
}
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
  # En PowerShell 5.1, la salida de error de un programa con Stop lanza excepcion: aqui no.
  $ErrorActionPreference = 'Continue'
  $sucio = (& git status --porcelain 2>$null) | Where-Object { $_ -notmatch '_v0\.121|aplicar-v0\.121' }
  $ErrorActionPreference = 'Stop'
  if ($sucio) {
    Write-Host 'Aviso: tienes cambios sin commitear. Se mezclaran con los de la v0.121.' -ForegroundColor Yellow
    $r = Read-Host 'Continuar? (s/n)'
    if ($r -ne 's') { Write-Host 'Cancelado. No se ha tocado nada.'; exit 1 }
  }
}

# ---------------------------------------------------------------- 2. copiar
Paso 'Copiando los ficheros de la v0.121'
$n = 0
Get-ChildItem -LiteralPath $carga -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($carga.Length).TrimStart('\', '/')
  if ($rel -like '.env*') { return }            # por si acaso: nunca
  $destino = Join-Path $raiz $rel
  $dir = Split-Path -Parent $destino
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item -LiteralPath $_.FullName -Destination $destino -Force
  Write-Host "  + $rel"
  $n++
}
Write-Host "$n ficheros copiados."

# ---------------------------------------------------------------- 3. limpiar
Paso 'Borrando lo que ya no hace falta'
$borrar = @(
  'IMPLEMENTAR-v0.117.0.md',
  'aplicar-v0.120.bat', 'aplicar-v0.120.ps1', '_v0.120'
)
$b = 0
foreach ($rel in $borrar) {
  $p = Join-Path $raiz $rel
  if (Test-Path -LiteralPath $p) {
    Remove-Item -LiteralPath $p -Recurse -Force
    Write-Host "  - $rel"
    $b++
  }
}
Write-Host "$b elementos borrados."

# ---------------------------------------------------------------- 4. verificar
# npm escribe avisos por la salida de error: que no paren el script.
$ErrorActionPreference = 'Continue'
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) { Mal 'No encuentro npm. Los ficheros ya estan copiados: ejecuta tu  npm run verificar  y  npm run build.' }
if (-not (Test-Path (Join-Path $raiz 'node_modules'))) {
  Paso 'No hay node_modules: npm install'
  & npm install
  if ($LASTEXITCODE -ne 0) { Mal 'npm install ha fallado.' }
}
Paso 'npm run verificar  (codificacion + acciones + i18n + tests + tsc)'
& npm run verificar
if ($LASTEXITCODE -ne 0) { Mal 'La verificacion ha fallado. Los cambios estan aplicados; mira el error de arriba. Este script y _v0.121 se quedan por si quieres repetir.' }
Paso 'npm run build'
& npm run build
if ($LASTEXITCODE -ne 0) { Mal 'El build ha fallado. Los cambios estan aplicados; mira el error de arriba. Este script y _v0.121 se quedan por si quieres repetir.' }

# ---------------------------------------------------------------- 5. recoger
Paso 'Todo correcto. Recogiendo'
$ErrorActionPreference = 'Stop'
Remove-Item -LiteralPath $carga -Recurse -Force
Remove-Item -LiteralPath $MyInvocation.MyCommand.Path -Force
if ($git) { Paso 'git status'; $ErrorActionPreference = 'Continue'; & git status --short }
Write-Host ''
Write-Host 'v0.121.0 aplicada. Prueba con  npm run dev  (pasos en IMPLEMENTAR-v0.121.0.md) y haz el commit.' -ForegroundColor Green
exit 0
