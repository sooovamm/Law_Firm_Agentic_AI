import type { LawyerProfile, LawyerProfileInput } from "@/types";

/** Projects a full LawyerProfile read model down to the partial input shape
 * the onboarding wizard and profile-edit form both write back through. */
export function toLawyerProfileInput(profile: LawyerProfile): LawyerProfileInput {
  return {
    years_of_experience: profile.years_of_experience ?? undefined,
    biography: profile.biography ?? undefined,
    languages_spoken: profile.languages_spoken,
    primary_practice_area: profile.primary_practice_area ?? undefined,
    secondary_practice_areas: profile.secondary_practice_areas,
    jurisdictions: profile.jurisdictions,
    bar_registration_number: profile.bar_registration_number ?? undefined,
    law_firm_name: profile.law_firm_name ?? undefined,
    highest_qualification: profile.highest_qualification ?? undefined,
    current_position: profile.current_position ?? undefined,
    total_cases_handled: profile.total_cases_handled,
    total_cases_won: profile.total_cases_won,
    total_cases_lost: profile.total_cases_lost,
    active_cases: profile.active_cases,
    settlement_cases: profile.settlement_cases,
    appeal_cases: profile.appeal_cases,
    average_case_duration_days: profile.average_case_duration_days ?? undefined,
    largest_case_value: profile.largest_case_value ?? undefined,
    notable_achievements: profile.notable_achievements ?? undefined,
    minimum_case_value: profile.minimum_case_value ?? undefined,
    maximum_case_value: profile.maximum_case_value ?? undefined,
    preferred_case_complexity: profile.preferred_case_complexity ?? undefined,
    preferred_client_type: profile.preferred_client_type ?? undefined,
    weekly_capacity: profile.weekly_capacity,
    preferred_consultation_days: profile.preferred_consultation_days,
    preferred_consultation_hours_start: profile.preferred_consultation_hours_start ?? undefined,
    preferred_consultation_hours_end: profile.preferred_consultation_hours_end ?? undefined,
    accepts_new_clients: profile.accepts_new_clients,
  };
}
