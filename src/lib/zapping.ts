export const MAX_NUMBER_DIGITS = 4;

// Chaîne voisine dans la liste affichée, en bouclant aux extrémités comme une télécommande.
export function stepChannel<T extends { id: string }>(
  list: readonly T[],
  currentId: string | undefined,
  delta: number,
): T | null {
  if (list.length === 0) return null;
  const index = list.findIndex((item) => item.id === currentId);
  if (index === -1) return delta >= 0 ? list[0] : list[list.length - 1];
  return list[(((index + delta) % list.length) + list.length) % list.length];
}

// Les numéros commencent à 1 : la chaîne n est la n-ième du catalogue.
export function channelAtNumber<T>(channels: readonly T[], value: string): T | null {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= 1 && number <= channels.length ? channels[number - 1] : null;
}

export function appendDigit(buffer: string, digit: string): string {
  if (!/^\d$/.test(digit)) return buffer;
  const next = `${buffer}${digit}`.replace(/^0+/, "");
  return next.slice(-MAX_NUMBER_DIGITS);
}

type ShortcutEvent = {
  target: EventTarget | null;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
};

const TYPING_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

// Les raccourcis à une touche ne doivent jamais voler la saisie d'un champ ni un raccourci système.
export function isShortcutIgnored(event: ShortcutEvent): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) return true;
  const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
  return Boolean(target && (TYPING_TAGS.has(target.tagName ?? "") || target.isContentEditable));
}

const SHARE_PARAM = "c";

export function readSharedChannelId(search: string): string | null {
  const value = new URLSearchParams(search).get(SHARE_PARAM);
  return value && /^[\w-]{1,200}$/.test(value) ? value : null;
}

export function withSharedChannel(href: string, id: string | null): string {
  const url = new URL(href);
  if (id) url.searchParams.set(SHARE_PARAM, id);
  else url.searchParams.delete(SHARE_PARAM);
  return url.href;
}
