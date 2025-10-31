import "FlowTransactionScheduler"

// Get the status of a scheduled transaction
access(all) fun main(transactionId: UInt64): {String: AnyStruct} {
    
    // Get the transaction status
    let status = FlowTransactionScheduler.getStatus(id: transactionId)
    
    if status == nil {
        return {
            "found": false,
            "transactionId": transactionId,
            "error": "Transaction not found"
        }
    }
    
    // Get the full transaction data
    let transactionData = FlowTransactionScheduler.getTransactionData(id: transactionId)
    
    // Map status values to readable names
    let statusNames = ["pending", "executing", "executed", "cancelled", "failed"]
    let statusRawValue = status!.rawValue
    
    let result: {String: AnyStruct} = {
        "found": true,
        "transactionId": transactionId,
        "status": statusRawValue,
        "statusName": statusNames[statusRawValue],
        "hasTransactionData": transactionData != nil
    }
    
    // Add transaction data details if available
    if transactionData != nil {
        result["transactionData"] = transactionData!
    }
    
    return result
}