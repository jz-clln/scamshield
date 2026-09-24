import { SVGProps } from "react";

const paths = {
  shield: <><path d="m12 3 8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="m8.5 12 2.3 2.3 4.7-4.7" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  text: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8" cy="8" r="1" /><path d="m3 16 5-5 4 4 3-3 6 6" /></>,
  sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 2v4M18 4h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  alert: <><path d="m10.2 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.8-3l-8-14a2 2 0 0 0-3.6 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  scan: <><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3M3 12h18" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
} satisfies Record<string, React.ReactNode>;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
