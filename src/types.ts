/**
 * @module
 * Shapes of the AppView responses the component reads. Only the fields it
 * uses are declared.
 */

export interface Label {
  val: string;
}

export interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: Array<
    | { $type: "app.bsky.richtext.facet#link"; uri: string }
    | { $type: "app.bsky.richtext.facet#mention"; did: string }
    | { $type: "app.bsky.richtext.facet#tag"; tag: string }
    | { $type: string }
  >;
}

export interface ProfileViewBasic {
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
}

export interface PostRecord {
  text?: string;
  createdAt?: string;
  facets?: Facet[];
}

export interface PostView {
  uri?: string;
  author?: ProfileViewBasic;
  record?: PostRecord;
  replyCount?: number;
  labels?: Label[];
}

export interface Threadgate {
  /** `hiddenReplies` is a list of AT-URIs; typed loosely so bad data is filtered. */
  record?: { hiddenReplies?: unknown[] };
}

export interface ThreadViewPost {
  $type: string;
  post?: PostView;
  replies?: ThreadViewPost[];
  threadgate?: Threadgate;
}
