export const TEXT_SIZE_KEY = "gwz_text_size";

/** Runs in <head> before the page paints, so a chosen text size never "jumps". */
export const TEXT_SIZE_SCRIPT = `try{var s=localStorage.getItem("${TEXT_SIZE_KEY}");if(s==="lg")document.documentElement.style.fontSize="118.75%";else if(s==="xl")document.documentElement.style.fontSize="131.25%"}catch(e){}`;
