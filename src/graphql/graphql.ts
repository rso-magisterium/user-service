import { buildSchemaSync } from "type-graphql";

import { UserResolver } from "./user";
import { TenantResolver } from "./tenant";

export default buildSchemaSync({
  resolvers: [UserResolver, TenantResolver],
});
