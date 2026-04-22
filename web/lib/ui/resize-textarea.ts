export function resizeTextarea(textarea: HTMLTextAreaElement, maxHeight = 192) {
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
}
