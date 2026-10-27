<#
  PokeArena TCG — aplicar la v0.71.

  Mira en qué versión estás:
    · v0.49 → primero arregla las ramas (guarda la rota y vuelve a la v0.49 limpia).
    · v0.50 o v0.51 → aplica solo lo nuevo.
  Luego: verifica, compila, migra la base de .env.local y hace el commit.

      powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.71.ps1"
      powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.71.ps1" -SoloSubir
#>
param(
  [string]$Zip = "$env:USERPROFILE\Downloads\pokearena-v0.71-completa.zip",
  [switch]$SoloSubir
)

function Paso($t)  { Write-Host "`n== $t" -ForegroundColor Cyan }
function Bien($t)  { Write-Host "   ✓ $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "   ! $t" -ForegroundColor Yellow }
function Falla($t) { Write-Host "`n✗ $t`n" -ForegroundColor Red; exit 1 }
function Corre([string]$que, [scriptblock]$cmd) {
  & $cmd
  if ($LASTEXITCODE -ne 0) { Falla "Ha fallado: $que. No se ha hecho commit ni se ha subido nada." }
}

if ($SoloSubir) {
  Paso "Subiendo development a GitHub"
  if ((git branch --show-current) -ne "development") { Falla "No estás en la rama development." }
  Corre "git push" { git push --force-with-lease origin development }
  Bien "Subido. Vercel lo desplegará solo."
  exit 0
}

Paso "1/6 · Comprobaciones"
if (-not (Test-Path "package.json") -or -not (Test-Path ".git")) { Falla "Ejecútalo desde la carpeta del proyecto (la que tiene package.json y .git)." }
if (-not (Test-Path $Zip)) { Falla "No encuentro el zip en: $Zip" }
$sucio = git status --porcelain --untracked-files=no
if ($sucio) { Falla "Tienes cambios sin guardar en Git. Haz commit o descártalos antes:`n$sucio" }
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
Bien "Estás en la v$version"

if ($version -eq "0.49.0") {
  Paso "2/6 · Estás en la v0.49: primero se arreglan las ramas"
  git rev-parse --verify --quiet backup-development | Out-Null
  if ($LASTEXITCODE -ne 0) { Falla "No existe la rama backup-development. Haz «git fetch --all» y prueba otra vez." }
  git rev-parse --verify --quiet development-roto | Out-Null
  if ($LASTEXITCODE -ne 0) { Corre "guardar la rama rota" { git branch development-roto development }; Bien "Rama rota guardada como development-roto" }
  Corre "git checkout" { git checkout development }
  Corre "git reset" { git reset --hard backup-development }
  Bien "development = v0.49 limpia"
} else {
  Paso "2/6 · Ramas: nada que arreglar"
  Bien "Se aplica encima de lo que tienes"
}

Paso "3/6 · Aplicando"
# tar y no Expand-Archive: Expand-Archive confunde los corchetes de [mazo] con comodines.
Corre "descomprimir" { tar -xf "$Zip" -C . }
git rm -q --ignore-unmatch IMPLEMENTAR-v0.45.0.md IMPLEMENTAR-v0.46.0.md IMPLEMENTAR-v0.47.0.md IMPLEMENTAR-v0.48.0.md IMPLEMENTAR-v0.49.0.md IMPLEMENTAR-v0.50.0.md PASOS-v0.51.md | Out-Null
Bien "Aplicado"

Paso "4/6 · Comprobando (un par de minutos)"
Corre "npm run verificar" { npm run verificar }
Corre "npm run build" { npm run build }
Bien "Verificación y build en verde"

Paso "5/6 · Migraciones de la base de .env.local (son seguras de repetir)"
npm run db:migrar
if ($LASTEXITCODE -ne 0) { Aviso "No se han podido lanzar. No es grave: se puede repetir con «npm run db:migrar»." }

Paso "6/6 · Commit"
git add -A -- src tests scripts drizzle public docs package.json CHANGELOG.md next.config.ts IMPLEMENTAR-v0.51.0.md PASOS-v0.63.md PASOS-v0.64.md PASOS-v0.65.md PASOS-v0.66.md PASOS-v0.67.md PASOS-v0.68.md PASOS-v0.69.md PASOS-v0.70.md PASOS-v0.71.md
Corre "git commit" { git commit -q -m "v0.71: herramientas, partida de liga desde «+», desplegable del tercer mazo" }
Bien "Commit hecho"

Write-Host "`n✓ Listo. Míralo con «npm run dev» y súbelo con:" -ForegroundColor Green
Write-Host "   powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -SoloSubir`n"
