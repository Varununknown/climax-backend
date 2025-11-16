# Direct R2 upload using curl - most reliable method
param(
    [string]$FilePath = $(if ($args) { $args[0] } else { Read-Host "Enter file path" })
)

if (-not (Test-Path $FilePath)) {
    Write-Host "❌ File not found: $FilePath"
    exit 1
}

$fileName = Split-Path $FilePath -Leaf
$fileSize = (Get-Item $FilePath).Length
$fileSizeMB = [math]::Round($fileSize / 1MB, 2)

Write-Host "`n📽️ Uploading: $fileName"
Write-Host "📊 Size: $fileSizeMB MB"
Write-Host "🔄 Method: Direct R2 API (curl)`n"

$r2Endpoint = "https://1de5ea2f9fef1e217236be8e34ffb849.r2.cloudflarestorage.com"
$bucketName = "ottvideos"
$accessKey = "b860747c66ddb440e0e56eff9465a5a6"
$secretKey = "8b82974a8bb7e5b0fb41e676cabb3ccddc46ee170291c5586a28bbf252f3cb42"
$s3Key = "Movies/$fileName"
$s3Url = "$r2Endpoint/$bucketName/$s3Key"

# Create AWS Signature V4
$date = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$dateOnly = [DateTime]::UtcNow.ToString("yyyyMMdd")
$region = "auto"
$service = "s3"

# Upload with curl
Write-Host "⏳ Starting upload..."
$curlArgs = @(
    "-X", "PUT",
    "-H", "Authorization: AWS4-HMAC-SHA256 Credential=$accessKey/$dateOnly/$region/$service/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=dummy",
    "-H", "x-amz-date: $date",
    "-H", "x-amz-content-sha256: UNSIGNED-PAYLOAD",
    "-H", "Content-Type: video/mp4",
    "--data-binary", "@`"$FilePath`"",
    "-L",
    "-o", "NUL",
    "-w", "`nStatus: %{http_code}`n",
    "$s3Url"
)

& curl.exe $curlArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Upload Complete!`n"
    Write-Host "═" * 70
    Write-Host "📌 Your Public URL:"
    Write-Host "═" * 70
    Write-Host "`nhttps://pub-95bb0d4ac3014d6082cbcd99b03f24c5.r2.dev/Movies/$fileName`n"
} else {
    Write-Host "`n❌ Upload failed with code $LASTEXITCODE"
    exit 1
}
