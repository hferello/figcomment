/**
 * Honeypot input: invisible to humans, tempting to bots.
 *
 * Bots that auto-fill every field will populate this "website" input; the
 * server rejects any submission where it is non-empty. Hiding strategy:
 * - Moved off-screen with absolute positioning (NOT display:none — naive
 *   bots skip fields they detect as display:none/visibility:hidden).
 * - aria-hidden + tabIndex=-1 keep it out of screen readers and tab order,
 *   so real users (including assistive tech) never encounter it.
 * - autoComplete="off" stops browsers helpfully filling it for real users.
 */

type HoneypotFieldProps = {
  /** Unique id per form so label/input pairs never collide on a page. */
  id: string;
};

export function HoneypotField({ id }: HoneypotFieldProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
    >
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
