import React, { ReactElement } from 'react'; 

type ErrorMessageProps = {
  message: string;
};

export default function ErrorMessage(props: ErrorMessageProps): ReactElement {
    return (
        <p>{props.message}</p>
    )
}