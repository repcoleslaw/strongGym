type UserCardProps = {
  name: string;
  loyaltyPoints: number;
};

export function UserCard({ name, loyaltyPoints }: UserCardProps) {
  return (
    <div className="card">
      <h2>Welcome, {name}</h2>
      <p>Loyalty points: {loyaltyPoints}</p>
    </div>
  );
}
