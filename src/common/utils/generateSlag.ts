export default function generateSlag(key: string) {
  const keyStr = key.split(' ').join('_');
  const slag = keyStr + Date.now();
  return slag;
}
