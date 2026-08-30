export type QuestionType = 'single_choice' | 'multi_choice' | 'free_text' | 'rating';
export type SurveyStatus = 'draft' | 'published' | 'closed';
export type RespondentNameSetting = 'none' | 'optional' | 'required';

export interface RatingConfig {
  min: number;
  max: number;
}

export interface OptionInput {
  id?: string;
  label: string;
}

export interface StoredOption {
  id: string;
  position: number;
  label: string;
}

export interface QuestionInput {
  prompt: string;
  type: QuestionType;
  required: boolean;
  config?: RatingConfig | null;
  options: OptionInput[];
}

export interface QuestionWithOptions {
  id: string;
  position: number;
  prompt: string;
  required: boolean;
  type: QuestionType;
  config: RatingConfig | null;
  options: StoredOption[];
}
