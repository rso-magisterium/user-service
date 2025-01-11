// @ts-nocheck
import "reflect-metadata";
import { ObjectType, Field, ID, buildSchemaSync, Resolver, Query, Arg, Resolver } from "type-graphql";
import prisma from "../prisma";
import logger from "../logger";

import { User } from "./user";

@ObjectType()
export class Tenant {
  @Field((type) => ID)
  id: string;

  @Field({ unique: true })
  name: string;

  @Field(() => User)
  admin: User;

  @Field(() => [User])
  users: User[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@Resolver(Tenant)
export class TenantResolver {
  @Query((returns) => Tenant)
  async tenant(@Arg("id") id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id }, include: { admin: true, users: true } });

    if (!tenant) {
      throw new Error(`Tenant not found: ${id}`);
    }

    logger.debug({ graphql: { resolver: "Tenant", query: "tenant", arguments: { id: id } } }, "Request processed");
    return tenant;
  }

  @Query((returns) => [Tenant])
  async allTenants() {
    const tenants = await prisma.tenant.findMany({ include: { admin: true, users: true } });

    logger.debug({ graphql: { resolver: "Tenant", query: "allTenants" } }, "Request processed");
    return tenants;
  }
}
