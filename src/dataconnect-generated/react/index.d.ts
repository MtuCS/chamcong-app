import { CreateNewUserData, CreateNewUserVariables, GetPostsByUserData, GetPostsByUserVariables, UpdatePostContentData, UpdatePostContentVariables, ListAllUsersData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateNewUser(options?: useDataConnectMutationOptions<CreateNewUserData, FirebaseError, CreateNewUserVariables>): UseDataConnectMutationResult<CreateNewUserData, CreateNewUserVariables>;
export function useCreateNewUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewUserData, FirebaseError, CreateNewUserVariables>): UseDataConnectMutationResult<CreateNewUserData, CreateNewUserVariables>;

export function useGetPostsByUser(vars: GetPostsByUserVariables, options?: useDataConnectQueryOptions<GetPostsByUserData>): UseDataConnectQueryResult<GetPostsByUserData, GetPostsByUserVariables>;
export function useGetPostsByUser(dc: DataConnect, vars: GetPostsByUserVariables, options?: useDataConnectQueryOptions<GetPostsByUserData>): UseDataConnectQueryResult<GetPostsByUserData, GetPostsByUserVariables>;

export function useUpdatePostContent(options?: useDataConnectMutationOptions<UpdatePostContentData, FirebaseError, UpdatePostContentVariables>): UseDataConnectMutationResult<UpdatePostContentData, UpdatePostContentVariables>;
export function useUpdatePostContent(dc: DataConnect, options?: useDataConnectMutationOptions<UpdatePostContentData, FirebaseError, UpdatePostContentVariables>): UseDataConnectMutationResult<UpdatePostContentData, UpdatePostContentVariables>;

export function useListAllUsers(options?: useDataConnectQueryOptions<ListAllUsersData>): UseDataConnectQueryResult<ListAllUsersData, undefined>;
export function useListAllUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllUsersData>): UseDataConnectQueryResult<ListAllUsersData, undefined>;
