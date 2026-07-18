import { useNavigate, useRouteError } from "react-router";

export default function ErrorLayout() {
  const error = useRouteError();
  const navigate = useNavigate();
  return (
    <div>
      <span>Oppaaa!</span>
      <span>An unexpected error has occurred.</span>
      <button
        onClick={() => {
          navigate(-1);
        }}
      >
        Go back
      </button>
    </div>
  );
}
