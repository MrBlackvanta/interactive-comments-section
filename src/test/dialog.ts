const openers = new WeakMap<HTMLDialogElement, Element | null>();

function showModal(this: HTMLDialogElement) {
  openers.set(this, document.activeElement);
  this.open = true;
  this.querySelector<HTMLElement>("button, [href], input, textarea")?.focus();
}

function close(this: HTMLDialogElement) {
  if (!this.open) return;

  this.open = false;
  const opener = openers.get(this);
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  this.dispatchEvent(new Event("close"));
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key !== "Escape") return;

  const modal = document.querySelector("dialog[open]");
  if (!(modal instanceof HTMLDialogElement)) return;

  modal.dispatchEvent(new Event("cancel"));
  modal.close();
}

export function installDialog() {
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;
  document.addEventListener("keydown", closeOnEscape);
}
