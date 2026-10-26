/** Shared decorative AI logo mark; the surrounding control supplies its accessible label. */
export function AiIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`ai-mark ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z"
        fill="currentColor"
      />
      <path
        d="M19 1C19.3 3.5 21 5.2 23.5 5.5C21 5.8 19.3 7.5 19 10C18.7 7.5 17 5.8 14.5 5.5C17 5.2 18.7 3.5 19 1Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}
