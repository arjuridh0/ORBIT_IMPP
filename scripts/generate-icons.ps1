$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = Resolve-Path 'public\logo-orbit-impp.png'
$source = [System.Drawing.Image]::FromFile($src)

foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($source, 0, 0, $size, $size)
  $bmp.Save((Join-Path (Split-Path $src) "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
$source.Dispose()
Write-Host 'Ikon PWA 192/512 dibuat.'