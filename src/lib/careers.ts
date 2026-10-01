// Shared words for the careers pages and the application form.

export const JOB_TYPE: Record<string, [string, string]> = {
  "full-time": ["Full time", "ពេញម៉ោង"],
  "part-time": ["Part time", "ក្រៅម៉ោង"],
  intern: ["Internship", "កម្មសិក្សា"],
  volunteer: ["Volunteer", "ស្ម័គ្រចិត្ត"],
};

export const MONTHS_KM = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type OpenJob = { id: string; title: string; title_km: string | null; department: string | null; salary: string | null; job_type: string };
