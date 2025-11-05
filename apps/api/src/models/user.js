import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("User", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, unique: "unique_email_index", },
    phone: { type: DataTypes.STRING, unique: "unique_phone_index", },
    password_hash: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "customer" }, 
    is_email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_phone_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    last_login_at: { type: DataTypes.DATE },
}, { tableName: "users", timestamps: true });
