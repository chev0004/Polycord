export const withoutGuidelinesTag = (text: string) =>
  text.replace(/<\/?guidelines>/g, '');
