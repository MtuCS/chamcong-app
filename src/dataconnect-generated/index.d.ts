import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateNewUserData {
  user_insert: User_Key;
}

export interface CreateNewUserVariables {
  email: string;
  username: string;
}

export interface GetPostsByUserData {
  posts: ({
    id: UUIDString;
    title: string;
    content: string;
  } & Post_Key)[];
}

export interface GetPostsByUserVariables {
  userId: UUIDString;
}

export interface ListAllUsersData {
  users: ({
    id: UUIDString;
    username: string;
    email: string;
  } & User_Key)[];
}

export interface Post_Key {
  id: UUIDString;
  __typename?: 'Post_Key';
}

export interface UpdatePostContentData {
  post_update?: Post_Key | null;
}

export interface UpdatePostContentVariables {
  id: UUIDString;
  content: string;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface CreateNewUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewUserVariables): MutationRef<CreateNewUserData, CreateNewUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewUserVariables): MutationRef<CreateNewUserData, CreateNewUserVariables>;
  operationName: string;
}
export const createNewUserRef: CreateNewUserRef;

export function createNewUser(vars: CreateNewUserVariables): MutationPromise<CreateNewUserData, CreateNewUserVariables>;
export function createNewUser(dc: DataConnect, vars: CreateNewUserVariables): MutationPromise<CreateNewUserData, CreateNewUserVariables>;

interface GetPostsByUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPostsByUserVariables): QueryRef<GetPostsByUserData, GetPostsByUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPostsByUserVariables): QueryRef<GetPostsByUserData, GetPostsByUserVariables>;
  operationName: string;
}
export const getPostsByUserRef: GetPostsByUserRef;

export function getPostsByUser(vars: GetPostsByUserVariables): QueryPromise<GetPostsByUserData, GetPostsByUserVariables>;
export function getPostsByUser(dc: DataConnect, vars: GetPostsByUserVariables): QueryPromise<GetPostsByUserData, GetPostsByUserVariables>;

interface UpdatePostContentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdatePostContentVariables): MutationRef<UpdatePostContentData, UpdatePostContentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdatePostContentVariables): MutationRef<UpdatePostContentData, UpdatePostContentVariables>;
  operationName: string;
}
export const updatePostContentRef: UpdatePostContentRef;

export function updatePostContent(vars: UpdatePostContentVariables): MutationPromise<UpdatePostContentData, UpdatePostContentVariables>;
export function updatePostContent(dc: DataConnect, vars: UpdatePostContentVariables): MutationPromise<UpdatePostContentData, UpdatePostContentVariables>;

interface ListAllUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllUsersData, undefined>;
  operationName: string;
}
export const listAllUsersRef: ListAllUsersRef;

export function listAllUsers(): QueryPromise<ListAllUsersData, undefined>;
export function listAllUsers(dc: DataConnect): QueryPromise<ListAllUsersData, undefined>;

