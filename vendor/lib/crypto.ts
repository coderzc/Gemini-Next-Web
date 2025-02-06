// 简单的加密函数
export function encrypt(text: string): string {
  const key = 's2s2gd72gdys2gzy2!233xqw'; // 加密密钥
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return Buffer.from(result).toString('base64');
}

// 简单的解密函数
export function decrypt(encryptedText: string): string {
  const key = 's2s2gd72gdys2gzy2!233xqw'; // 解密密钥
  const text = Buffer.from(encryptedText, 'base64').toString();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return result;
} 