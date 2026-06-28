/**
 * Convertit le format d'entrée vers le format de sortie Trox
 * @param {Object} inputData 
 * @returns {Object} formattedData
 */
export function mapToTroxFormat(inputData) {
    return {
        trox_id: `TROX-${inputData.id}`,
        content: inputData.payload,
        processed_at: new Date().toISOString(),
        status: 'BRIDGED'
    };
}