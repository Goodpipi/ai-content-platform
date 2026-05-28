$pairs = @(
  @{ id = 'home-ops'; cap = '522443cb-3a40-45d4-9556-b621c039bec6' },
  @{ id = 'home-reviewer'; cap = 'bf53953b-cde7-41d9-8a30-4c599b686238' },
  @{ id = 'library'; cap = 'c98b993f-32a8-4b8c-aac6-3b12737985e3' },
  @{ id = 'workspace-copy'; cap = '6655c5a9-f089-455e-8cd9-7cf099f1d834' },
  @{ id = 'workspace-visual'; cap = '01bd9989-5676-4cfb-bd4c-86ebc4a45e0d' },
  @{ id = 'workspace-team'; cap = '2abb5cfb-fcb6-411f-8d4d-7feef1a7642b' },
  @{ id = 'reviewer-copy'; cap = '80ed5b46-1214-4f42-9711-1477d26ebeb6' },
  @{ id = 'reviewer-visual'; cap = '4b8ed1f3-184f-4ae2-8b8c-47cfab830d4b' },
  @{ id = 'visual-editor'; cap = '6b517084-8c5c-4e9b-9773-7bd90c1a901f' }
)

foreach ($p in $pairs) {
  $endpoint = [uri]::EscapeDataString("https://mcp.figma.com/mcp/capture/$($p.cap)/submit")
  $url = "http://localhost:5173/?figma=$($p.id)#figmacapture=$($p.cap)&figmaendpoint=$endpoint&figmadelay=4500"
  Write-Host "Opening $($p.id) ..."
  Start-Process $url
  Start-Sleep -Seconds 6
}
