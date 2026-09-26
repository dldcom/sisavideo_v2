export function BlankText({ text, answer, showAnswer = false }: { text: string; answer: string; showAnswer?: boolean }) {
  const parts = text.split('@@BLANK@@');
  return <>{parts.map((part, i) => <span key={i}>{part}{i < parts.length - 1 && <span className="blank">{showAnswer ? answer : '\u00a0'}</span>}</span>)}</>;
}
