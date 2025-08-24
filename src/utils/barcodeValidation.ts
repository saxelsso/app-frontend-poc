export interface ValidationResult {
    valid: boolean;
    error: string;
}

export function isValidBarcode(barcode: string): ValidationResult {
    // Allow empty barcode since it's optional
    if (!barcode.trim()) {
        return { valid: true, error: '' };
    }

    const cleanBarcode = barcode.trim();

    // Check length - most common barcodes are 8-14 digits
    if (cleanBarcode.length < 8 || cleanBarcode.length > 14) {
        return {
            valid: false,
            error: 'Barcode must be between 8 and 14 digits'
        };
    }

    // Check that it contains only digits
    if (!/^\d+$/.test(cleanBarcode)) {
        return {
            valid: false,
            error: 'Barcode must contain only numbers'
        };
    }

    // Validate common barcode formats with check digits
    if (cleanBarcode.length === 8) {
        if (!isValidEAN8(cleanBarcode)) {
            return { valid: false, error: 'Invalid EAN-8 barcode checksum' };
        }
    } else if (cleanBarcode.length === 12) {
        if (!isValidUPCA(cleanBarcode)) {
            return { valid: false, error: 'Invalid UPC-A barcode checksum' };
        }
    } else if (cleanBarcode.length === 13) {
        if (!isValidEAN13(cleanBarcode)) {
            return { valid: false, error: 'Invalid EAN-13 barcode checksum' };
        }
    }

    return { valid: true, error: '' };
}

function isValidEAN8(barcode: string): boolean {
    const digits = barcode.split('').map(Number);
    const checksum = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    const calculatedChecksum = (10 - (sum % 10)) % 10;
    return calculatedChecksum === checksum;
}

function isValidUPCA(barcode: string): boolean {
    const digits = barcode.split('').map(Number);
    const checksum = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (i % 2 === 0 ? 3 : 1);
    }

    const calculatedChecksum = (10 - (sum % 10)) % 10;
    return calculatedChecksum === checksum;
}

function isValidEAN13(barcode: string): boolean {
    const digits = barcode.split('').map(Number);
    const checksum = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const calculatedChecksum = (10 - (sum % 10)) % 10;
    return calculatedChecksum === checksum;
}