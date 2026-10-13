export const toneUrl = (seconds: number) => {
  const rate = 8000;
  const samples = rate * seconds;
  const view = new DataView(new ArrayBuffer(44 + samples * 2));
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++)
      view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index++)
    view.setInt16(
      44 + index * 2,
      Math.sin((index / rate) * 2 * Math.PI * 440) * 8000,
      true,
    );
  return URL.createObjectURL(new Blob([view], { type: 'audio/wav' }));
};
