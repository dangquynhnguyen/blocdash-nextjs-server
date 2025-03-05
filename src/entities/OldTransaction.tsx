import "reflect-metadata";
import { ObjectType } from "type-graphql";
import { Entity, Index } from "typeorm";
import { Transaction } from "./Transaction";

@ObjectType()
@Index("idx_to_created_at", ["to_account_identifier", "created_at"])
@Index("idx_from_created_at", ["from_account_identifier", "created_at"])
@Entity()
export class OldTransaction extends Transaction {}
