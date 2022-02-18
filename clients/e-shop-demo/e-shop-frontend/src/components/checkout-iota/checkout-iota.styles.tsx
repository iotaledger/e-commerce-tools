import styled from 'styled-components';

export const CheckoutWithIotaContainer = styled.div`
	color: white;
	border: none;
	padding: 35px;
	font-size: 16px;
	border-radius: 2px;
	margin: 20px;
	background-image: url('../../assets/iota_logo_white.png');
	background-color: black;
	border-radius: 3px;

	@media screen and (max-width: 600px) {
		margin: 20px 0;
		padding: 25px 20px;
	}
`;

export const CheckoutWithIotaContainerHeading = styled.h3`
	margin-top: 0;
`;

export const CheckoutStepHeading = styled.h4`
	margin: 15px 0 10px 0;
`;
