import { Query, Resolver } from "type-graphql";
import { UniqueWalletsHourly } from "./../entities/UniqueWalletsHourly";

@Resolver()
export class UniqueWalletsHourlyResolver {
	@Query((_return) => [UniqueWalletsHourly])
	async uniqueWalletsHourly(): Promise<UniqueWalletsHourly[]> {
		return UniqueWalletsHourly.find();
	}
}
