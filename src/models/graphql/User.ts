// @ts-nocheck
import "reflect-metadata";
import { ObjectType, Field, ID, buildSchemaSync, Resolver, Query, Arg } from "type-graphql";
import prisma from "../../prisma";
import logger from "../../logger";

@ObjectType()
export class User {
  @Field((type) => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@Resolver(User)
export class UserResolver {
  @Query((returns) => User)
  async user(@Arg("id") id: string) {
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${id}`);
    }

    logger.debug({ graphql: { resolver: "User", query: "user", arguments: { id: id } } }, "Request processed");
    return user;
  }

  @Query((returns) => [User])
  async allUsers() {
    const users = await prisma.user.findMany();

    if (!users) {
      throw new Error(`User not found: ${id}`);
    }

    logger.debug({ graphql: { resolver: "User", query: "allUsers" } }, "Request processed");
    return users;
  }
}

export default buildSchemaSync({
  resolvers: [UserResolver],
});
