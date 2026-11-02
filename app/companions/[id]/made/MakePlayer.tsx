"use client";

import { useState } from "react";

// Companion-made HTML and Strudel never run until Raziel taps play, and only inside an iframe whose
// sandbox grants scripts and nothing else: no same-origin, so it cannot read Hearth's cookies or call
// its APIs. The document comes in as a string (srcdoc); it is never fetched from Hearth's origin.
export default function MakePlayer({ title, srcDoc, label = "play" }: { title: string; srcDoc: string; label?: string }) {
  const [on, setOn] = useState(false);
  if (!on) {
    return (
      <button type="button" className="h-btn is-outlined h-make-play" onClick={() => setOn(true)}>
        {label}
      </button>
    );
  }
  return (
    <iframe
      title={title}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="h-make-frame"
      referrerPolicy="no-referrer"
    />
  );
}
