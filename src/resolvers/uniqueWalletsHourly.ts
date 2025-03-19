import { Ctx, Query, Resolver } from "type-graphql";
import { Context } from "../types/Context";
import { UniqueWalletsHourly } from "./../entities/UniqueWalletsHourly";

@Resolver()
export class UniqueWalletsHourlyResolver {
	@Query((_return) => [UniqueWalletsHourly], { nullable: true })
	async uniqueWalletsHourly(
		@Ctx() { req }: Context
	): Promise<UniqueWalletsHourly[] | null> {
		return UniqueWalletsHourly.find({
			order: { hour: "ASC" },
		});
	}
}
