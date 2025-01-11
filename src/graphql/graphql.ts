import "reflect-metadata";
import { buildSchemaSync } from "type-graphql";
import {
  UserCrudResolver,
  TenantCrudResolver,
  UserRelationsResolver,
  TenantRelationsResolver,
} from "@generated/type-graphql";

export default buildSchemaSync({
  resolvers: [UserCrudResolver, TenantCrudResolver, UserRelationsResolver, TenantRelationsResolver],
  validate: false,
});
