# ==============================================================================
# e-Krishi Kisaan Procurement Management System - Local REST & Static Server
# Smart India Hackathon (SIH26032)
# ==============================================================================

$port = 5000
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbFile = Join-Path $baseDir "data\database.json"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  e-Krishi Procurement & Payment Tracking System (SIH)" -ForegroundColor Yellow
Write-Host "  Server root: $baseDir" -ForegroundColor Cyan
Write-Host "  Listening on: http://localhost:$port/" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

if (-not (Test-Path $dbFile)) {
    Write-Error "Database file not found: $dbFile"
    exit 1
}

# Function to read database
function Get-Db {
    $raw = Get-Content -Path $dbFile -Raw -Encoding UTF8
    return ($raw | ConvertFrom-Json)
}

# Function to save database
function Save-Db($data) {
    $json = $data | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($dbFile, $json, [System.Text.Encoding]::UTF8)
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Port $port might be in use, trying 5050..." -ForegroundColor Yellow
    $port = 5050
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
}

Write-Host "Server successfully started. Open your browser at:" -ForegroundColor Green
Write-Host "  👉 http://localhost:$port/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server.`n" -ForegroundColor Gray

# MIME types
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS Headers
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath
        $httpMethod = $request.HttpMethod

        # Helper to send JSON
        $sendJson = {
            param($obj, $statusCode = 200)
            $json = $obj | ConvertTo-Json -Depth 10
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $response.StatusCode = $statusCode
            $response.ContentType = "application/json; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
        }

        # Read JSON body if present
        $body = $null
        if ($request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $bodyRaw = $reader.ReadToEnd()
            if ($bodyRaw) {
                try {
                    $body = $bodyRaw | ConvertFrom-Json
                } catch {}
            }
        }

        # ------------------- API ROUTING -------------------
        if ($urlPath.StartsWith("/api/")) {
            $db = Get-Db

            # GET /api/status
            if ($urlPath -eq "/api/status" -and $httpMethod -eq "GET") {
                & $sendJson @{
                    status = "online"
                    app = "Farmer Procurement & Payment Tracking System"
                    version = "1.0.0"
                    timestamp = (Get-Date).ToString("o")
                }
                continue
            }

            # GET /api/farmers
            if ($urlPath -eq "/api/farmers" -and $httpMethod -eq "GET") {
                & $sendJson $db.farmers
                continue
            }

            # GET /api/msp
            if ($urlPath -eq "/api/msp" -and $httpMethod -eq "GET") {
                & $sendJson $db.mspRates
                continue
            }

            # GET /api/centres
            if ($urlPath -eq "/api/centres" -and $httpMethod -eq "GET") {
                & $sendJson $db.procurementCentres
                continue
            }

            # GET /api/procurements
            if ($urlPath -eq "/api/procurements" -and $httpMethod -eq "GET") {
                $farmerId = $request.QueryString["farmerId"]
                $res = $db.procurements
                if ($farmerId) {
                    $res = @($res | Where-Object { $_.farmerId -eq $farmerId })
                }
                & $sendJson $res
                continue
            }

            # POST /api/procurements (Create new procurement registration)
            if ($urlPath -eq "/api/procurements" -and $httpMethod -eq "POST") {
                $newId = "PRC-2024-" + [string](Get-Random -Minimum 1000 -Maximum 9999)
                $centre = $db.procurementCentres | Where-Object { $_.id -eq $body.procurementCentreId } | Select-Object -First 1
                $centreName = if ($centre) { $centre.name } else { "Central Mandi" }

                $nowStr = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                $stages = @(
                    [PSCustomObject]@{
                        stageId = 1
                        stageName = "Registration Submitted"
                        status = "Completed"
                        completedAt = $nowStr
                        officer = "Online Farmer Portal"
                        relevantInfo = "Crop: $($body.cropName) | Est. Qty: $($body.estimatedQuantityKg) kg"
                        remarks = "Application registered successfully."
                    },
                    [PSCustomObject]@{
                        stageId = 2
                        stageName = "Slot Booking Confirmed"
                        status = "In Progress"
                        completedAt = $null
                        officer = "APMC Mandi Scheduler"
                        relevantInfo = "Slot Requested for $($body.slotDate), $($body.slotTime)"
                        remarks = "Slot verification in progress."
                    },
                    [PSCustomObject]@{
                        stageId = 3
                        stageName = "Produce Arrived at Procurement Centre"
                        status = "Pending"
                        completedAt = $null
                        officer = "Security Gate"
                        relevantInfo = "Awaiting physical arrival."
                        remarks = "-"
                    },
                    [PSCustomObject]@{
                        stageId = 4
                        stageName = "Quality Inspection"
                        status = "Pending"
                        completedAt = $null
                        officer = "Quality Assayer"
                        relevantInfo = "Pending arrival."
                        remarks = "-"
                    },
                    [PSCustomObject]@{
                        stageId = 5
                        stageName = "Weighing Completed"
                        status = "Pending"
                        completedAt = $null
                        officer = "Weighbridge Station"
                        relevantInfo = "Pending quality clearance."
                        remarks = "-"
                    },
                    [PSCustomObject]@{
                        stageId = 6
                        stageName = "Procurement Approved"
                        status = "Pending"
                        completedAt = $null
                        officer = "Procurement Officer"
                        relevantInfo = "Pending weighing."
                        remarks = "-"
                    },
                    [PSCustomObject]@{
                        stageId = 7
                        stageName = "Payment Processing"
                        status = "Pending"
                        completedAt = $null
                        officer = "Accounts Cell"
                        relevantInfo = "Pending sanction order."
                        remarks = "-"
                    },
                    [PSCustomObject]@{
                        stageId = 8
                        stageName = "Payment Completed"
                        status = "Pending"
                        completedAt = $null
                        officer = "DBT Gateway"
                        relevantInfo = "Pending disbursement."
                        remarks = "-"
                    }
                )

                $estQty = [double]$body.estimatedQuantityKg
                $msp = [double]$body.mspPerQuintal
                $totAmount = [math]::Round(($estQty / 100.0) * $msp, 2)

                $newProc = [PSCustomObject]@{
                    id = $newId
                    farmerId = $body.farmerId
                    farmerName = $body.farmerName
                    cropName = $body.cropName
                    variety = $body.variety
                    estimatedQuantityKg = $estQty
                    actualQuantityKg = $estQty
                    mspPerQuintal = $msp
                    totalAmount = $totAmount
                    procurementCentreId = $body.procurementCentreId
                    centreName = $centreName
                    slotDate = $body.slotDate
                    slotTime = $body.slotTime
                    weighingDate = $null
                    currentStageIndex = 2
                    procurementStatus = "In Progress"
                    paymentStatus = "Payment Pending"
                    vehicleNumber = $body.vehicleNumber
                    tokenNumber = "TKN-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    createdAt = $nowStr
                    updatedAt = $nowStr
                    stages = $stages
                }

                $newPay = [PSCustomObject]@{
                    id = "PAY-2024-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    procurementId = $newId
                    farmerId = $body.farmerId
                    farmerName = $body.farmerName
                    cropName = $body.cropName
                    totalValue = $totAmount
                    amountPaid = 0
                    pendingAmount = $totAmount
                    transactionId = "TXN-2024-" + (Get-Random -Minimum 10000 -Maximum 99999)
                    paymentDate = $null
                    paymentMethod = "Direct Benefit Transfer (DBT-PFMS)"
                    bankReferenceNo = "PENDING-REGISTRATION"
                    beneficiaryAccount = "Linked Bank Account"
                    status = "Payment Pending"
                    remarks = "New procurement booked. Pending delivery and inspection."
                }

                $newNotif = [PSCustomObject]@{
                    id = "NOTIF-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    farmerId = $body.farmerId
                    procurementId = $newId
                    type = "SLOT_CONFIRMED"
                    title = "Procurement Slot Booked"
                    message = "Procurement registration $newId confirmed for $($body.cropName) on $($body.slotDate). Centre: $centreName."
                    channel = "In-App & SMS"
                    isRead = $false
                    createdAt = $nowStr
                }

                $db.procurements = @($db.procurements) + $newProc
                $db.payments = @($db.payments) + $newPay
                $db.notifications = @($db.notifications) + $newNotif
                Save-Db $db

                & $sendJson @{ success = $true; procurement = $newProc } 201
                continue
            }

            # PUT /api/procurements/:id/stage (Update stage status and remarks)
            if ($urlPath -match "^/api/procurements/([^/]+)/stage$" -and $httpMethod -eq "PUT") {
                $procId = $Matches[1]
                $proc = $db.procurements | Where-Object { $_.id -eq $procId } | Select-Object -First 1
                if (-not $proc) {
                    & $sendJson @{ error = "Procurement not found" } 404
                    continue
                }

                $targetStageId = [int]$body.stageId
                $newStageStatus = $body.status # Completed, In Progress, Pending
                $officer = if ($body.officer) { $body.officer } else { "Admin Official" }
                $remarks = if ($body.remarks) { $body.remarks } else { "Status updated by authority." }
                $relevantInfo = $body.relevantInfo
                $nowStr = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")

                # Update stage array
                foreach ($st in $proc.stages) {
                    if ($st.stageId -eq $targetStageId) {
                        $st.status = $newStageStatus
                        if ($newStageStatus -eq "Completed") {
                            $st.completedAt = $nowStr
                        }
                        if ($remarks) { $st.remarks = $remarks }
                        if ($relevantInfo) { $st.relevantInfo = $relevantInfo }
                        if ($officer) { $st.officer = $officer }
                    } elseif ($st.stageId -lt $targetStageId -and $newStageStatus -eq "Completed") {
                        if ($st.status -ne "Completed") {
                            $st.status = "Completed"
                            if (-not $st.completedAt) { $st.completedAt = $nowStr }
                        }
                    } elseif ($st.stageId -eq ($targetStageId + 1) -and $newStageStatus -eq "Completed") {
                        if ($st.status -eq "Pending") {
                            $st.status = "In Progress"
                        }
                    }
                }

                # Update currentStageIndex and overall procurement status
                if ($newStageStatus -eq "Completed") {
                    $proc.currentStageIndex = [math]::Min(8, $targetStageId + 1)
                    if ($targetStageId -ge 6) {
                        $proc.procurementStatus = "Completed"
                    } else {
                        $proc.procurementStatus = "In Progress"
                    }
                } else {
                    $proc.currentStageIndex = $targetStageId
                    $proc.procurementStatus = "In Progress"
                }

                # If stage 5 (Weighing) was updated with actual quantity
                if ($targetStageId -eq 5 -and $body.actualQuantityKg) {
                    $proc.actualQuantityKg = [double]$body.actualQuantityKg
                    $proc.weighingDate = (Get-Date).ToString("yyyy-MM-dd")
                    $proc.totalAmount = [math]::Round(($proc.actualQuantityKg / 100.0) * $proc.mspPerQuintal, 2)
                    
                    # Update payment value too
                    $payRec = $db.payments | Where-Object { $_.procurementId -eq $procId } | Select-Object -First 1
                    if ($payRec) {
                        $payRec.totalValue = $proc.totalAmount
                        $payRec.pendingAmount = [math]::Max(0, $proc.totalAmount - $payRec.amountPaid)
                    }
                }

                # If stage 7 or 8 completed, sync payment
                if ($targetStageId -eq 7 -and $newStageStatus -eq "Completed") {
                    $payRec = $db.payments | Where-Object { $_.procurementId -eq $procId } | Select-Object -First 1
                    if ($payRec) {
                        $payRec.status = "Payment Processing"
                    }
                    $proc.paymentStatus = "Payment Processing"
                } elseif ($targetStageId -eq 8 -and $newStageStatus -eq "Completed") {
                    $payRec = $db.payments | Where-Object { $_.procurementId -eq $procId } | Select-Object -First 1
                    if ($payRec) {
                        $payRec.status = "Payment Successful"
                        $payRec.amountPaid = $payRec.totalValue
                        $payRec.pendingAmount = 0
                        $payRec.paymentDate = $nowStr
                        if ($body.bankReferenceNo) { $payRec.bankReferenceNo = $body.bankReferenceNo }
                    }
                    $proc.paymentStatus = "Payment Successful"
                }

                $proc.updatedAt = $nowStr

                # Create appropriate Notification
                $stageNames = @{
                    1 = "Registration Submitted"
                    2 = "Slot Booking Confirmed"
                    3 = "Produce Arrived at Mandi"
                    4 = "Quality Inspection Completed"
                    5 = "Weighing Completed"
                    6 = "Procurement Approved"
                    7 = "Payment Processing Started"
                    8 = "Payment Successfully Credited"
                }
                $notifType = switch ($targetStageId) {
                    2 { "SLOT_CONFIRMED" }
                    3 { "ARRIVAL" }
                    4 { "QUALITY" }
                    5 { "WEIGHING" }
                    6 { "APPROVED" }
                    7 { "PAYMENT_INITIATED" }
                    8 { "PAYMENT_SUCCESS" }
                    default { "GENERAL" }
                }

                $newNotif = [PSCustomObject]@{
                    id = "NOTIF-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    farmerId = $proc.farmerId
                    procurementId = $proc.id
                    type = $notifType
                    title = "$($stageNames[$targetStageId]) ($newStageStatus)"
                    message = "Procurement $($proc.id) for $($proc.cropName): $($stageNames[$targetStageId]) is now $newStageStatus. $remarks"
                    channel = "In-App & SMS"
                    isRead = $false
                    createdAt = $nowStr
                }

                $db.notifications = @($db.notifications) + $newNotif
                Save-Db $db

                & $sendJson @{ success = $true; procurement = $proc; notification = $newNotif }
                continue
            }

            # PUT /api/procurements/:id/payment (Update payment status)
            if ($urlPath -match "^/api/procurements/([^/]+)/payment$" -and $httpMethod -eq "PUT") {
                $procId = $Matches[1]
                $proc = $db.procurements | Where-Object { $_.id -eq $procId } | Select-Object -First 1
                $payRec = $db.payments | Where-Object { $_.procurementId -eq $procId } | Select-Object -First 1

                if (-not $payRec) {
                    & $sendJson @{ error = "Payment record not found" } 404
                    continue
                }

                $nowStr = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                $newStatus = $body.status # Payment Pending, Payment Processing, Payment Successful, Payment Failed
                $payRec.status = $newStatus

                if ($body.bankReferenceNo) { $payRec.bankReferenceNo = $body.bankReferenceNo }
                if ($body.transactionId) { $payRec.transactionId = $body.transactionId }
                if ($body.paymentMethod) { $payRec.paymentMethod = $body.paymentMethod }
                if ($body.remarks) { $payRec.remarks = $body.remarks }

                if ($newStatus -eq "Payment Successful") {
                    $payRec.amountPaid = $payRec.totalValue
                    $payRec.pendingAmount = 0
                    $payRec.paymentDate = $nowStr
                    if ($proc) {
                        $proc.paymentStatus = "Payment Successful"
                        $proc.currentStageIndex = 8
                        # Complete stage 8
                        foreach ($st in $proc.stages) {
                            if ($st.stageId -eq 8) {
                                $st.status = "Completed"
                                $st.completedAt = $nowStr
                                $st.relevantInfo = "Bank Ref / UTR: $($payRec.bankReferenceNo)"
                                $st.remarks = "Payment credited to beneficiary bank account via DBT."
                            }
                        }
                    }
                } elseif ($newStatus -eq "Payment Processing") {
                    if ($proc) { $proc.paymentStatus = "Payment Processing" }
                } elseif ($newStatus -eq "Payment Failed") {
                    $payRec.amountPaid = 0
                    $payRec.pendingAmount = $payRec.totalValue
                    if ($proc) { $proc.paymentStatus = "Payment Failed" }
                }

                # Notification for payment
                $notifType = if ($newStatus -eq "Payment Successful") { "PAYMENT_SUCCESS" } elseif ($newStatus -eq "Payment Failed") { "PAYMENT_FAILED" } else { "PAYMENT_INITIATED" }
                $notifTitle = switch ($newStatus) {
                    "Payment Successful" { "Payment Credited Successfully" }
                    "Payment Failed" { "Payment Credit Failed" }
                    default { "Payment Processing Update" }
                }
                $notifMsg = switch ($newStatus) {
                    "Payment Successful" { "Amount of ₹$($payRec.totalValue) for $($payRec.cropName) has been credited. UTR: $($payRec.bankReferenceNo)." }
                    "Payment Failed" { "Payment of ₹$($payRec.totalValue) failed. Reason: $($payRec.remarks). Mandi finance officer notified." }
                    default { "Payment of ₹$($payRec.totalValue) is currently under processing." }
                }

                $newNotif = [PSCustomObject]@{
                    id = "NOTIF-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    farmerId = $payRec.farmerId
                    procurementId = $procId
                    type = $notifType
                    title = $notifTitle
                    message = $notifMsg
                    channel = "In-App & SMS"
                    isRead = $false
                    createdAt = $nowStr
                }

                $db.notifications = @($db.notifications) + $newNotif
                Save-Db $db

                & $sendJson @{ success = $true; payment = $payRec; procurement = $proc }
                continue
            }

            # GET /api/payments
            if ($urlPath -eq "/api/payments" -and $httpMethod -eq "GET") {
                $farmerId = $request.QueryString["farmerId"]
                $res = $db.payments
                if ($farmerId) {
                    $res = @($res | Where-Object { $_.farmerId -eq $farmerId })
                }
                & $sendJson $res
                continue
            }

            # GET /api/notifications
            if ($urlPath -eq "/api/notifications" -and $httpMethod -eq "GET") {
                $farmerId = $request.QueryString["farmerId"]
                $res = $db.notifications
                if ($farmerId) {
                    $res = @($res | Where-Object { $_.farmerId -eq $farmerId })
                }
                # Sort newest first
                $res = @($res | Sort-Object -Property createdAt -Descending)
                & $sendJson $res
                continue
            }

            # POST /api/notifications/mark-read
            if ($urlPath -eq "/api/notifications/mark-read" -and $httpMethod -eq "POST") {
                $farmerId = $body.farmerId
                $notifId = $body.notificationId
                foreach ($n in $db.notifications) {
                    if ($notifId -and $n.id -eq $notifId) {
                        $n.isRead = $true
                    } elseif ($farmerId -and $n.farmerId -eq $farmerId) {
                        $n.isRead = $true
                    }
                }
                Save-Db $db
                & $sendJson @{ success = $true }
                continue
            }

            # Fallback 404 for unknown API
            & $sendJson @{ error = "API route not found" } 404
            continue
        }

        # ------------------- STATIC FILE SERVING -------------------
        $relPath = $urlPath.TrimStart("/").Replace("/", "\")
        if (-not $relPath -or $relPath -eq "") {
            $relPath = "index.html"
        }

        $filePath = Join-Path $baseDir $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.StatusCode = 200
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
        } else {
            # Serve index.html for SPA routes or 404
            $indexPath = Join-Path $baseDir "index.html"
            if (Test-Path $indexPath) {
                $bytes = [System.IO.File]::ReadAllBytes($indexPath)
                $response.StatusCode = 200
                $response.ContentType = "text/html; charset=utf-8"
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
                $response.StatusCode = 404
                $response.OutputStream.Write($msg, 0, $msg.Length)
                $response.Close()
            }
        }
    } catch {
        Write-Host "Request error: $_" -ForegroundColor Red
        try {
            $response.StatusCode = 500
            $response.Close()
        } catch {}
    }
}
