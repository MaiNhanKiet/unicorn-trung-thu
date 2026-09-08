/** Build embedded VietQR image URL (không mở trang PayOS). */
export function buildVietQrImageUrl(input: {
  bin: string;
  accountNumber: string;
  amount: number;
  orderCode: number;
  description?: string | null;
}) {
  const description = (
    input.description || `DONATE ${input.orderCode}`
  ).replace(/\s+/g, "+");

  return (
    `https://img.vietqr.io/image/` +
    `${input.bin}-${input.accountNumber}-vietqr_pro.jpg` +
    `?addInfo=${description}&amount=${input.amount}`
  );
}
