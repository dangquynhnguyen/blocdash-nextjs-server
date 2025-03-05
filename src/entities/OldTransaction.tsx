import "reflect-metadata";
import { ObjectType } from "type-graphql";
import { Entity } from "typeorm";
import { Transaction } from "./Transaction";

@ObjectType()
@Entity()
export class OldTransaction extends Transaction {}
