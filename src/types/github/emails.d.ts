/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type GithubEmails = Email[];

/**
 * Email
 */
export interface Email {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
  [k: string]: unknown;
}
